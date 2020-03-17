import axios from 'axios';

export async function pingCloudFunctions() {
	const linearRegression = 'https://us-central1-optimum-essence-210921.cloudfunctions.net/statsmodels';
	await axios.post(
		linearRegression,
		{ ping: 'ping' },
		{
			crossDomain: true,
		},
	);

	const gcloud = 'https://us-central1-optimum-essence-210921.cloudfunctions.net/distribution';
	await axios.post(
		gcloud,
		{ ping: 'ping' },
		{
			crossDomain: true,
		},
	);
}

export async function performLinearRegressionAnalysis(colXArr, colYArr, colX, colY, XYCols) {
	// const lambda = 'https://8gf5s84idd.execute-api.us-east-2.amazonaws.com/test/scipytest';
	// const gcloud = 'https://us-central1-optimum-essence-210921.cloudfunctions.net/statsmodels';
	const gcloud = 'https://us-central1-optimum-essence-210921.cloudfunctions.net/regression';
	const result = await axios.post(
		gcloud,
		{
			x: colXArr,
			y: colYArr,
		},
		{
			crossDomain: true,
		},
	);
	// console.log(result.data) // gcloud
	// console.log(result.data.body); // Lambda
	const {
		conf_low,
		conf_upp,
		mean_x,
		mean_y,
		std_x,
		std_y,
		pvalues,
		rsquared,
		corrcoef,
		cov,
		degree_2_poly,
		degree_3_poly,
		degree_4_poly,
		degree_5_poly,
		degree_6_poly,
		slope,
		intercept,
		mean_ci_low,
		mean_ci_upp,
		centered_2_poly,
		centered_3_poly,
		centered_4_poly,
		centered_5_poly,
		centered_6_poly,
	} = result.data;

	console.log(result.data);

	return {
		confLow: conf_low,
		confUpp: conf_upp,
		meanCiLow: mean_ci_low,
		meanCiUpp: mean_ci_upp,
		corrcoef: corrcoef[1][0].toFixed(4) / 1,
		covariance: cov[1][0].toFixed(4) / 1,
		colX,
		colAMean: mean_x.toFixed(4) / 1,
		colAStdev: std_x.toFixed(4) / 1,
		colY,
		colBMean: mean_y.toFixed(4) / 1,
		colBStdev: std_y.toFixed(4) / 1,
		pValue: pvalues[1].toFixed(4) / 1,
		degree2Poly: degree_2_poly,
		degree3Poly: degree_3_poly,
		degree4Poly: degree_4_poly,
		degree5Poly: degree_5_poly,
		degree6Poly: degree_6_poly,
		centeredDegree2Poly: centered_2_poly,
		centeredDegree3Poly: centered_3_poly,
		centeredDegree4Poly: centered_4_poly,
		centeredDegree5Poly: centered_5_poly,
		centeredDegree6Poly: centered_6_poly,
		coordinates: XYCols,
		linearRegression: {
			coefficients: [ slope.toFixed(4) / 1, intercept.toFixed(4) / 1 ],
			determination: rsquared.toFixed(4) / 1,
		},
	};
}

export async function performDistributionAnalysis(colY, vals, numberOfBins) {
	// TODO: Add some error here
	if (vals.length === 0) return;
	// const lambda = 'https://8gf5s84idd.execute-api.us-east-2.amazonaws.com/test/scipytest';
	const gcloud = 'https://us-central1-optimum-essence-210921.cloudfunctions.net/distribution';
	const result = await axios.post(
		gcloud,
		{
			y: vals,
		},
		{
			crossDomain: true,
		},
	);
	console.log(result.data); // gcloud
	// console.log(result.data.body); // Lambda
	const { mean_y, std_y, count, quantiles, histogram, skew, kurtosis } = result.data;
	return {
		count,
		colObj: colY,
		mean: mean_y,
		stdev: std_y,
		vals,
		boxPlotData: quantiles,
		histogram,
		skew,
		kurtosis,
		numberOfBins,
	};
}

export async function createBarChart(colXArr, colYArr, colZArr, colX, colY, colZ, XYZCols, colXScale) {
	return {
		colXArr,
		colYArr,
		colZArr,
		colX,
		colY,
		colZ,
		coordinates: XYZCols,
		colXScale,
	};
}
