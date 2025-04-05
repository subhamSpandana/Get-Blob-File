import connectToDatabase from "../config/ms-sql"; 

export async function fetchDataFromTable() {
  try {
    const pool = await connectToDatabase(); 
    const result = await pool.request().query('SELECT * FROM Tbl_BureauResponseTest'); 
    console.log('Data fetched successfully:', result.recordset);
    return result.recordset; 
  } catch (err) {
    console.error('Failed to fetch data from the table:', err);
    throw err;
  }
}