import React from 'react';
import { useSelectDispatch } from '../context/SpreadsheetProvider';
import { SELECT_CELL } from '../constants';

export default React.memo(function BlankClickableCell({ columnID, rowIndex, columnIndex }) {
	const dispatchSelectAction = useSelectDispatch();
	// Cells that are one row beyond the total number of rows that can be clicked
	function onMouseDown(event) {
		dispatchSelectAction({ type: SELECT_CELL, rowIndex, columnIndex, columnID, rowID: 'blankrow' });
	}

	if (columnID) {
		return <div style={{ backgroundColor: 'white', height: '100%', width: '100%' }} onMouseDown={onMouseDown} />;
	} else {
		// Cells in blank clickable row but not in a defined column
		return <div style={{ backgroundColor: '#eee', height: '100%', width: '100%' }} />;
	}
});
