import React, { useEffect } from 'react';
import { Parser } from 'hot-formula-parser';
import './App.css';
import Row from './Row'
import { useSpreadsheetState, useSpreadsheetDispatch } from './SpreadsheetProvider';
import ColResizer from './ColResizer'

function isFormula(value) {
  return typeof value === 'string' && value.charAt(0) === '=';
}

function createRandomID() {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function createCell() {
  return {[createRandomID()]: {value: null}};
}

function Spreadsheet({eventBus}) {
  const {cells, activeCell, cellPositions} = useSpreadsheetState();
  const dispatchSpreadsheetAction = useSpreadsheetDispatch();

  useEffect(() => {
    if (activeCell) {
      eventBus.fire('select-cell', activeCell);
    }
  }, [activeCell, eventBus]);
  useEffect(() => {
    console.log('cells updated:', cells);
  }, [cells]);
  useEffect(()  => {
    console.log('cell positions:', cellPositions);
  }, [cellPositions]);

  const formulaParser = new Parser();
  formulaParser.on('callCellValue', function(cellCoordinates, done) {
    const cellValue = cells[cellPositions[cellCoordinates.row.index][cellCoordinates.column.index]].value;
    if (isFormula(cellValue)) {
      const {error, result} = formulaParser.parse(cellValue.slice(1));
      done(error || result);
    } else {
      done(cellValue);
    }
  });

  const columnCount = Math.max(...(cellPositions.map((row) => row.length)));

  function changeActiveCell(row, column)  {
    const activeCell = cellPositions[row] && cellPositions[row][column];
    if (activeCell) {
      dispatchSpreadsheetAction({type: 'activateCell', activeCell});
    } else if (row >= 0 && row < cellPositions.length && column >= 0 && column < columnCount) {
      // If there is no cell at the current location, create one and add its position and then activate it
      const newCell = createCell();
      const cellID = Object.keys(newCell)[0];
      // Add new cell to cell container
      dispatchSpreadsheetAction({type: 'createCell', cellID});
      dispatchSpreadsheetAction({type: 'setCellPosition', row, column, cellID});
      dispatchSpreadsheetAction({type: 'activateCell', activeCell: cellID});
    }
  }

  // We add one more column header as the capstone for the column of row headers
  const headers = Array(columnCount + 1).fill(undefined).map((_, index) => (<ColResizer key={index} minWidth={60} content={String.fromCharCode(index - 1 + 'A'.charCodeAt(0))}/>))
  const rows = cellPositions.map((row, index) => {
    const emptyCellCount = columnCount - row.length;
    return (<Row key={index} row={row} rowIndex={index} emptyCellCount={emptyCellCount} cells={cells}
       activeCell={activeCell} setActiveCell={changeActiveCell} formulaParser={formulaParser}/>)
  });
  return (
    <table>
      <thead><tr>{headers}</tr></thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

export default Spreadsheet;
