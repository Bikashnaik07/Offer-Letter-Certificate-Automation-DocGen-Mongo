const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');

/**
 * Parse CSV file and return data array
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} - Parsed CSV data
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Clean up the data object keys (remove extra spaces)
        const cleanData = {};
        Object.keys(data).forEach(key => {
          const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
          cleanData[cleanKey] = data[key].trim();
        });
        results.push(cleanData);
      })
      .on('end', () => {
        console.log(`📄 CSV parsed successfully: ${results.length} rows`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('❌ CSV parsing error:', error);
        reject(error);
      });
  });
};

/**
 * Parse Excel file and return data array
 * @param {string} filePath - Path to Excel file
 * @param {string} sheetName - Sheet name (optional)
 * @returns {Array} - Parsed Excel data
 */
const parseExcel = (filePath, sheetName = null) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = sheetName || workbook.SheetNames[0];
    
    if (!workbook.Sheets[sheet]) {
      throw new Error(`Sheet '${sheet}' not found in Excel file`);
    }
    
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
    
    // Clean up the data (similar to CSV parsing)
    const cleanData = data.map(row => {
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
        cleanRow[cleanKey] = String(row[key]).trim();
      });
      return cleanRow;
    });
    
    console.log(`📊 Excel parsed successfully: ${cleanData.length} rows from sheet '${sheet}'`);
    return cleanData;
    
  } catch (error) {
    console.error('❌ Excel parsing error:', error);
    throw error;
  }
};

/**
 * Validate data against template placeholders
 * @param {Array} data - Parsed data array
 * @param {Array} requiredFields - Required field names
 * @returns {Object} - Validation result
 */
const validateData = (data, requiredFields) => {
  const errors = [];
  const warnings = [];
  
  if (!data || data.length === 0) {
    errors.push('No data found in file');
    return { valid: false, errors, warnings };
  }
  
  // Check if all required fields are present in the first row
  const firstRow = data[0];
  const availableFields = Object.keys(firstRow);
  
  requiredFields.forEach(field => {
    const normalizedField = field.toLowerCase().replace(/\s+/g, '_');
    if (!availableFields.includes(normalizedField)) {
      errors.push(`Required field '${field}' not found in data. Available fields: ${availableFields.join(', ')}`);
    }
  });
  
  // Check for empty rows
  data.forEach((row, index) => {
    const hasData = Object.values(row).some(value => value && value.trim() !== '');
    if (!hasData) {
      warnings.push(`Row ${index + 2} appears to be empty`);
    }
  });
  
  // Check for missing values in required fields
  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      const normalizedField = field.toLowerCase().replace(/\s+/g, '_');
      if (!row[normalizedField] || row[normalizedField].trim() === '') {
        warnings.push(`Row ${index + 2}: Missing value for '${field}'`);
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalRows: data.length,
    validRows: data.filter(row => Object.values(row).some(value => value && value.trim() !== '')).length
  };
};

/**
 * Map CSV/Excel columns to template placeholders
 * @param {Array} data - Parsed data array
 * @param {Object} mapping - Column to placeholder mapping
 * @returns {Array} - Mapped data array
 */
const mapDataToPlaceholders = (data, mapping) => {
  try {
    return data.map((row, index) => {
      const mappedRow = {};
      
      Object.keys(mapping).forEach(placeholder => {
        const column = mapping[placeholder];
        const normalizedColumn = column.toLowerCase().replace(/\s+/g, '_');
        
        if (row[normalizedColumn] !== undefined) {
          mappedRow[placeholder] = row[normalizedColumn];
        } else {
          console.warn(`Warning: Column '${column}' not found in row ${index + 1}`);
          mappedRow[placeholder] = '';
        }
      });
      
      // Add row index for tracking
      mappedRow._rowIndex = index + 1;
      
      return mappedRow;
    });
  } catch (error) {
    console.error('❌ Data mapping error:', error);
    throw error;
  }
};

/**
 * Get column names from file
 * @param {string} filePath - Path to file
 * @param {string} fileType - File type ('csv' or 'xlsx')
 * @returns {Promise<Array>} - Column names
 */
const getColumnNames = async (filePath, fileType) => {
  try {
    if (fileType === 'csv') {
      const data = await parseCSV(filePath);
      return data.length > 0 ? Object.keys(data[0]) : [];
    } else if (fileType === 'xlsx') {
      const data = parseExcel(filePath);
      return data.length > 0 ? Object.keys(data[0]) : [];
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('❌ Error getting column names:', error);
    throw error;
  }
};

/**
 * Clean up uploaded file
 * @param {string} filePath - Path to file to clean up
 */
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🧹 Cleaned up file: ${filePath}`);
    }
  } catch (error) {
    console.error('❌ File cleanup error:', error);
  }
};

module.exports = {
  parseCSV,
  parseExcel,
  validateData,
  mapDataToPlaceholders,
  getColumnNames,
  cleanupFile
};
