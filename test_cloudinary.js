const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'wu9aqdtk',
  api_key: '478791176995847',
  api_secret: '3Y_z4RXPBy1OE1k7ZCJeonoNyEM'
});

console.log('Testing Cloudinary upload with user credentials...');

cloudinary.uploader.upload_stream(
  { resource_type: 'raw', folder: 'test', public_id: 'test_connect_' + Date.now() },
  (error, result) => {
    if (error) {
      console.error('Cloudinary Test FAILED:', error.message || error);
    } else {
      console.log('Cloudinary Test SUCCESS! Secure URL:', result.secure_url);
    }
    process.exit(error ? 1 : 0);
  }
).end(Buffer.from('hello world cloudinary test'));
