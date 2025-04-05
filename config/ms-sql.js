import sql from 'mssql';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER, // IP address of the server
  database: process.env.DB_DATABASE, // Database name
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // Convert string to boolean
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' // Convert string to boolean
  }
};

export default async function connectToDatabase() {
  try {
    const pool = await sql.connect(config);
    console.log('Connected to the MS SQL database.');
    return pool; // Return the connection pool
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
}