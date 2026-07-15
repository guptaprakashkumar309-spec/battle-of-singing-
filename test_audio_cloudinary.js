const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: 'wu9aqdtk',
  api_key: '478791176995847',
  api_secret: '3Y_z4RXPBy1OE1k7ZCJeonoNyEM'
});

console.log('Testing Cloudinary upload with a REAL audio file...');

const filePath = path.join('uploads', 'ladki_bdi_anjani_haipm3_joiner-1783841795247-831183195.mp3');
if (!fs.existsSync(filePath)) {
  console.error('Error: Test file not found at:', filePath);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(filePath);

cloudinary.uploader.upload_stream(
  { resource_type: 'raw', folder: 'test', public_id: 'test_audio_real_' + Date.now() },
  (error, result) => {
    if (error) {
      console.error('Cloudinary Real Audio Upload FAILED:', error.message || error);
    } else {
      console.log('Cloudinary Real Audio Upload SUCCESS! Secure URL:', result.secure_url);
    }
    process.exit(error ? 1 : 0);
  }
).end(fileBuffer);
