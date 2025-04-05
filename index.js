import express from 'express';
import connectToDatabase from './config/ms-sql.js'; 
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import dotenv from 'dotenv'; 

dotenv.config();



const app = express();

app.use(express.json());

app.get('/', async (req, res) => {
  try {
    await connectToDatabase(); 
    res.send('Server is running on port 3000 and connected to the database.');
  } catch (err) {
    res.status(500).send('Failed to connect to the database.');
  }
});

app.get('/data', async (req, res) => {
  try {
    const pool = await connectToDatabase(); 
    const result = await pool.request().query('SELECT * FROM Tbl_BureauResponseTest'); // Query the table
    res.json(result.recordset); 
  } catch (err) {
    console.error('Failed to fetch data from the table:', err);
    res.status(500).send('Failed to fetch data from the table.');
  }
});

// Define a route to download the XML file based on VoterID
app.get('/download', async (req, res) => {
  const { VoterID } = req.query; 

  if (!VoterID) {
    return res.status(400).send('VoterID is required.');
  }

  try {
    const pool = await connectToDatabase(); 
    const result = await pool.request()
      .input('VoterID', VoterID) 
      .query('SELECT BlobURL FROM Tbl_BureauResponseTest WHERE VoterID = @VoterID'); // Query the table

    if (result.recordset.length === 0) {
      return res.status(404).send('No record found for the given VoterID.');
    }

    let blobURL = result.recordset[0].BlobURL; 

    // Remove extra "crif/" if it exists
    if (blobURL.startsWith('crif/crif/')) {
      blobURL = blobURL.replace('crif/crif/', 'crif/');
    }

    const containerName = 'mock'; 
    const blobName = blobURL; 

    const accountName = process.env.AZURE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_ACCOUNT_KEY;

    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new StorageSharedKeyCredential(accountName, accountKey)
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);

    const blobClient = containerClient.getBlobClient(blobName);

    const blobExists = await blobClient.exists();
    if (!blobExists) {
      return res.status(404).send(`Blob "${blobName}" does not exist in container "${containerName}".`);
    }

    const downloadBlockBlobResponse = await blobClient.download();

    res.setHeader('Content-Disposition', `attachment; filename=${VoterID}.xml`);
    res.setHeader('Content-Type', 'application/xml');

    downloadBlockBlobResponse.readableStreamBody.pipe(res);
  } catch (err) {
    console.error('Failed to download the file from Azure Blob Storage:', err);
    res.status(500).send('Failed to download the file from Azure Blob Storage.');
  }
});

// Define a route to list blobs in the "mock" container
app.get('/showBlob', async (req, res) => {
  try {
    const accountName = process.env.AZURE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_ACCOUNT_KEY;

    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new StorageSharedKeyCredential(accountName, accountKey)
    );

    const containerName = 'mock';
    const containerClient = blobServiceClient.getContainerClient(containerName);

    const containerExists = await containerClient.exists();
    if (!containerExists) {
      return res.status(404).send(`Container "${containerName}" does not exist.`);
    }

    // List all blobs in the "mock" container
    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      blobs.push(blob.name); 
    }


    res.json({ container: containerName, blobs });
  } catch (err) {
    console.error('Failed to list blobs from the "mock" container:', err);
    res.status(500).send('Failed to list blobs from the "mock" container.');
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});