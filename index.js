
// ! Imports
require('dotenv').config();
const express = require("express");
const admin = require("firebase-admin");
const Jimp = require("jimp");
const path = require("path");


// ! Initialize Firebase Admin SDK
admin.initializeApp({
    // credential: admin.credential.cert(require("./firebase_admin_cert.json")),
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
    }),
    databaseURL: process.env.DATABASE_URL,
    storageBucket: process.env.STORAGE_BUCKET, // Your Firebase Storage bucket name
});


// ! Startup Express Server
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// const hueVariations = [8, 15, 22, 38, 47, 65, 78, 85, 105, 115, 132];
const hueVariations = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340];
const colorVariations = [
  "#3d34e8", 
  "#8f32dd", 
  "#8f32dd", 
  "#da27b7", 
  "#fa4db2", 
  "#fa4db2", 
  "#f33441", 
  "#ed663d", 
  "#e78431", 
  "#e78431", 
  "#58d06e",
  "#58d06e",
  "#58d06e",
  "#58d06e",
  "#58d06e",
  "#34e9d1",
  "#36bfe8", 
];


// ! Root Route
app.get("/", (req, res) => {
  res.send("Hello World!");
});


// ! generateVariations
app.post("/generateColorVariations", async (req, res) => {
  console.log("/generateVariations api call");
  const { uid, auto_id: autoID, target_path: targetPath } = req.body;
  if (!uid || !autoID || !targetPath) {
    return res.status(400).json({ message: "Missing required parameters." });
  }

  try {
    // Check if user exists
    const user = await admin.auth().getUser(uid);
    if (!user) {
      return res.status(403).json({ message: "Access Denied" });
    }

    const bucket = admin.storage().bucket();
    const blob = bucket.file(targetPath);
    const dbRefPath = `users/${uid}/collections/${autoID}`;
    const databaseRef = admin.database().ref(dbRefPath);
    // console.log(`dbRefPath is: ${dbRefPath}`);

    // Download the image
    const [imageBuffer] = await blob.download();
    const originalImage = await Jimp.Jimp.read(imageBuffer);
    const imageVariations = [];
    const imageVariationUrls = [];

    // Loop through the hue variations and generate the variations
    for (const hueValue of hueVariations) {
      const modifiedImage = await adjustHue(originalImage.clone(), hueValue);

      // Convert to buffer
      const modifiedBuffer = await modifiedImage.getBuffer(Jimp.JimpMime.jpeg);

      // Construct the target path for the variation
      const targetPathParts = path.parse(targetPath);
      const variationPath = `${targetPathParts.dir}/${targetPathParts.name}.${hueValue}.jpg`;

      // Upload the modified image
      const variationBlob = bucket.file(variationPath);
      await variationBlob.save(modifiedBuffer, {
        contentType: "image/jpeg",
      });

      imageVariations.push(variationPath);
    }
    
    // Generate the URL for the variation and update in firebase database
    for (let i = 0; i < imageVariations.length; i++) {
      const imagePath = imageVariations[i];
      const imageUrl = await bucket.file(imagePath).getSignedUrl({
        action: 'read',
        expires: '03-09-2799',
        // contentType: 'image/jpeg',
      });
      // console.log(imageUrl);

      imageVariationUrls.push(imageUrl[0]);
    }
    const dataPrep = {
      "name": autoID,
      "images": imageVariationUrls
    };
    await databaseRef.update(dataPrep);

    // return response
    return res.status(200).json({
      message: "Generated variations successfully",
      colors: colorVariations.reverse(),
      images: imageVariations,
      imageUrls: imageVariationUrls,
    });
  } 
  catch (error) {
    console.error("Error generating variations:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});


// ! deleteVariations
app.delete('/deleteVariations', async (req, res) => {
  const { uid, auto_id: autoID, target_path: targetPath } = req.body;
  if (!uid || !autoID || !targetPath) {
    return res.status(400).json({ message: "Missing required parameters." });
  }

  try {
    const bucket = admin.storage().bucket();
    
    // List all files in the folder
    const [files] = await bucket.getFiles({ prefix: targetPath });

    // Delete all files in the folder
    const deletionPromises = files.map((file) => file.delete());
    await Promise.all(deletionPromises);

    console.log(`Directory ${targetPath} and its contents have been deleted.`);

    return res.status(200).json({
      message: `Directory ${targetPath} deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting directory:', error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});


// ! Some Helper/Math Functions
function adjustHue(image, hueShift) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const red = this.bitmap.data[idx + 0];
    const green = this.bitmap.data[idx + 1];
    const blue = this.bitmap.data[idx + 2];

    // Convert RGB to HSL
    const { h, s, l } = rgbToHsl(red, green, blue);

    // Adjust the hue and wrap around if necessary
    let newHue = (h + hueShift) % 360;
    if (newHue < 0) newHue += 360;

    // Convert back to RGB
    const { r, g, b } = hslToRgb(newHue, s, l);

    // Set the new color values
    this.bitmap.data[idx + 0] = r;
    this.bitmap.data[idx + 1] = g;
    this.bitmap.data[idx + 2] = b;
  });

  return image;
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l;

  l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return { h: h * 360, s, l };
}

function hslToRgb(h, s, l) {
  let r, g, b;

  h /= 360;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

