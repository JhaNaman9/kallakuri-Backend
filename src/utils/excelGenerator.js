const xl = require('excel4node');
const logger = require('./logger');

/**
 * Generate an Excel file from data
 * @param {Object} options - Options for generating the Excel file
 * @param {String} options.filename - The name of the file
 * @param {String} options.sheetName - The name of the sheet
 * @param {Array} options.headers - Array of header titles
 * @param {Array} options.data - Array of data rows
 * @returns {xl.Workbook} - The Excel workbook
 */
const generateExcel = (options) => {
  try {
    const { filename, sheetName, headers, data } = options;
    
    // Create a new workbook and add a worksheet
    const wb = new xl.Workbook();
    const ws = wb.addWorksheet(sheetName || 'Sheet1');
    
    // Create style for headers
    const headerStyle = wb.createStyle({
      font: {
        color: '#FFFFFF',
        size: 12,
        bold: true,
      },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: '#4F81BD',
      },
      border: {
        left: {
          style: 'thin',
          color: '#000000',
        },
        right: {
          style: 'thin',
          color: '#000000',
        },
        top: {
          style: 'thin',
          color: '#000000',
        },
        bottom: {
          style: 'thin',
          color: '#000000',
        },
      },
    });
    
    // Add headers to the worksheet
    headers.forEach((header, index) => {
      ws.cell(1, index + 1)
        .string(header)
        .style(headerStyle);
    });
    
    // Add data to the worksheet
    data.forEach((row, rowIndex) => {
      Object.keys(row).forEach((key, columnIndex) => {
        const cellValue = row[key] !== null && row[key] !== undefined ? row[key].toString() : '';
        ws.cell(rowIndex + 2, columnIndex + 1).string(cellValue);
      });
    });
    
    return wb;
  } catch (error) {
    logger.error(`Error generating Excel file: ${error.message}`);
    throw error;
  }
};

module.exports = { generateExcel }; 