require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Detect Cloud Mode Configuration
const isCloudStorageEnabled = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const isGoogleSheetsEnabled = !!process.env.GOOGLE_SHEET_WEBAPP_URL;

let cloudinary = null;

if (isCloudStorageEnabled) {
  console.log('⚡ Cloud media storage enabled (Cloudinary)');
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
} else {
  console.log('📁 Local media storage enabled (uploads/ directory)');
  // Serve uploaded files statically at '/uploads' endpoint
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

if (isGoogleSheetsEnabled) {
  console.log('📊 Google Sheets database sync enabled');
} else {
  console.log('📁 Local JSON database enabled (data/registrations.json)');
}

// Middleware: Restrict access to local admin or remote admin with a valid key
const verifyAdmin = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    token = req.query.key;
  }
  
  const expectedPassword = process.env.ADMIN_PASSWORD || 'GLAAdmin2026';
  
  if (isLocal || token === expectedPassword) {
    next();
  } else {
    res.status(403).send('Forbidden: Access is restricted. A valid admin key is required.');
  }
};

// Route: Serve admin.html only to local admin or remote admin with key
app.get('/admin.html', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  
  const expectedPassword = process.env.ADMIN_PASSWORD || 'GLAAdmin2026';
  const key = req.query.key;
  
  if (isLocal || key === expectedPassword) {
    res.sendFile(path.join(__dirname, 'admin.html'));
  } else {
    res.status(403).send('Forbidden: Access to this page requires a valid admin key.');
  }
});

// Serve public static frontend files *after* the admin.html check to intercept public access
app.use(express.static(path.join(__dirname, 'public')));

// Ensure local directories exist
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'registrations.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

// Multer Storage Configuration
const storage = isCloudStorageEnabled
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
      }
    });

// Audio file filter function
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/m4a'];
  if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files (MP3, WAV, OGG, M4A, AAC) are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB file size limit
  }
});

// Helper function to read registrations from local JSON file
function readDatabase() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file, resetting:', err);
    return [];
  }
}

// Helper function to write registrations to local JSON file
function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
}

// Promise helper to upload stream buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9]/g, '_');
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'battle-of-singing',
        public_id: `${cleanName}-${uniqueSuffix}`
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Helper function to save registration to Google Sheets
async function saveToGoogleSheets(registration) {
  if (!isGoogleSheetsEnabled) return;

  try {
    const payload = {
      id: registration.id,
      name: registration.name,
      course: registration.course,
      rollNo: registration.rollNo,
      year: registration.year,
      branch: registration.branch,
      participationType: registration.participationType,
      partnerName: registration.partnerName || '',
      partnerCourse: registration.partnerCourse || '',
      partnerRollNo: registration.partnerRollNo || '',
      partnerYear: registration.partnerYear || '',
      partnerBranch: registration.partnerBranch || '',
      trackOriginalName: registration.trackOriginalName,
      trackPath: registration.trackPath,
      registeredAt: registration.registeredAt
    };

    const response = await fetch(process.env.GOOGLE_SHEET_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log('📊 Registration data forwarded to Google Sheets.');
    } else {
      console.error('Failed to forward data to Google Sheets. Status:', response.status);
    }
  } catch (sheetError) {
    console.error('Error forwarding data to Google Sheets:', sheetError.message);
  }
}

// API endpoint: Register a student / duet team (Public Access)
app.post('/api/register', (req, res) => {
  upload.single('track')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      // Check registration deadline (5 August 2026 at 11:59:59 PM IST)
      const DEADLINE = new Date('2026-08-06T00:00:00+05:30');
      if (new Date() >= DEADLINE) {
        return res.status(400).json({ success: false, message: 'Registrations are now closed. The last date to register was 5 August 2026.' });
      }

      const {
        name, course, rollNo, year, branch,
        participationType,
        partnerName, partnerCourse, partnerRollNo, partnerYear, partnerBranch
      } = req.body;

      if (!name || !course || !rollNo || !year || !branch || !participationType) {
        return res.status(400).json({ success: false, message: 'All primary participant fields are required.' });
      }

      if (participationType === 'duet') {
        if (!partnerName || !partnerCourse || !partnerRollNo || !partnerYear || !partnerBranch) {
          return res.status(400).json({ success: false, message: 'All partner fields are required for Duet participation.' });
        }
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Audio track file upload is required.' });
      }

      let currentList = [];
      if (isGoogleSheetsEnabled) {
        try {
          const sheetResponse = await fetch(process.env.GOOGLE_SHEET_WEBAPP_URL);
          const sheetResult = await sheetResponse.json();
          if (sheetResult.success && sheetResult.data) {
            currentList = sheetResult.data;
          }
        } catch (fetchErr) {
          console.error('Error fetching sheet list for duplicate check, checking local backup:', fetchErr.message);
          currentList = readDatabase();
        }
      } else {
        currentList = readDatabase();
      }

      const rollExists = currentList.some(reg => 
        reg.rollNo.toLowerCase() === rollNo.trim().toLowerCase() ||
        (participationType === 'duet' && reg.partnerRollNo && reg.partnerRollNo.toLowerCase() === rollNo.trim().toLowerCase()) ||
        (reg.partnerRollNo && reg.partnerRollNo.toLowerCase() === partnerRollNo?.trim().toLowerCase()) ||
        (partnerRollNo && reg.rollNo.toLowerCase() === partnerRollNo.trim().toLowerCase())
      );

      if (rollExists) {
        return res.status(400).json({ 
          success: false, 
          message: 'A participant with this Roll Number is already registered for the event.' 
        });
      }

      const ticketNum = Math.floor(1000 + Math.random() * 9000);
      const registrationId = `BOS-2026-${ticketNum}`;

      let audioPath = '';
      let cloudPublicId = '';
      
      if (isCloudStorageEnabled) {
        const cloudFile = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        audioPath = cloudFile.secure_url;
        cloudPublicId = cloudFile.public_id;
      } else {
        audioPath = `/uploads/${req.file.filename}`;
        cloudPublicId = req.file.filename;
      }

      const newRegistration = {
        id: registrationId,
        name: name.trim(),
        course,
        rollNo: rollNo.trim(),
        year,
        branch: branch.trim(),
        participationType,
        partnerName: participationType === 'duet' ? partnerName.trim() : null,
        partnerCourse: participationType === 'duet' ? partnerCourse : null,
        partnerRollNo: participationType === 'duet' ? partnerRollNo.trim() : null,
        partnerYear: participationType === 'duet' ? partnerYear : null,
        partnerBranch: participationType === 'duet' ? partnerBranch.trim() : null,
        trackOriginalName: req.file.originalname,
        trackFileName: cloudPublicId,
        trackPath: audioPath.startsWith('http') 
          ? audioPath 
          : `${process.env.PUBLIC_URL || 'http://localhost:' + PORT}${audioPath}`,
        registeredAt: new Date().toISOString()
      };

      if (isGoogleSheetsEnabled) {
        await saveToGoogleSheets(newRegistration);
      }

      const localDb = readDatabase();
      localDb.push(newRegistration);
      writeDatabase(localDb);

      return res.status(201).json({
        success: true,
        message: 'Registration successful!',
        data: newRegistration
      });

    } catch (error) {
      console.error('Registration processing error:', error);
      return res.status(500).json({ success: false, message: 'Server error occurred while saving registration.' });
    }
  });
});

// API endpoint: Get all registrations (Restricted to Authorized Admin)
app.get('/api/registrations', verifyAdmin, async (req, res) => {
  try {
    if (isGoogleSheetsEnabled) {
      const response = await fetch(process.env.GOOGLE_SHEET_WEBAPP_URL);
      const result = await response.json();
      
      if (result.success && result.data) {
        const sortedList = [...result.data].sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
        return res.json({ success: true, count: sortedList.length, data: sortedList });
      }
      throw new Error(result.error || 'Failed to read from Google Sheet');
    } else {
      const db = readDatabase();
      const sortedDb = [...db].sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
      res.json({ success: true, count: sortedDb.length, data: sortedDb });
    }
  } catch (error) {
    console.error('Error fetching registrations, loading local backup:', error.message);
    const db = readDatabase();
    const sortedDb = [...db].sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
    res.json({ success: true, count: sortedDb.length, data: sortedDb, source: 'local_backup' });
  }
});

// API endpoint: Delete a registration (Restricted to Authorized Admin)
app.delete('/api/registrations/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    let db = readDatabase();
    const index = db.findIndex(reg => reg.id === id);
    let record = null;

    if (index !== -1) {
      record = db[index];
      if (!isCloudStorageEnabled) {
        const filePath = path.join(UPLOADS_DIR, record.trackFileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      db.splice(index, 1);
      writeDatabase(db);
    }

    if (isCloudStorageEnabled && record && record.trackFileName) {
      try {
        await new Promise((resolve, reject) => {
          cloudinary.uploader.destroy(record.trackFileName, { resource_type: 'video' }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
      } catch (cErr) {
        console.error('Warning: Cloudinary media deletion failed:', cErr.message);
      }
    }

    if (isGoogleSheetsEnabled) {
      console.log(`⚠️ Record ${id} deleted. Please delete row from Google Sheet manually if required.`);
    }

    res.json({ success: true, message: 'Registration successfully deleted.' });
  } catch (error) {
    console.error('Error deleting registration:', error);
    res.status(500).json({ success: false, message: 'Failed to delete registration.' });
  }
});

// Fallback error handler
app.use((err, req, res, next) => {
  res.status(500).json({ success: false, message: err.message || 'An unknown server error occurred.' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Battle of Singing Server running on http://localhost:${PORT}`);
});
