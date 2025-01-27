
![Alt text](https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F7uz33nr2h3qrmdq3tte8.png)

# privvy-nodejs-prod

## Project Overview

This is a Node.js application serving as an image generation backend for the Privvy mobile app. It handles file storage, image processing, and potentially interacts with Firebase services. The project provides two main endpoints for generating color variations of images stored in a Firebase storage bucket and deleting directories containing these variations.
This production app is currently deployed to render.com, but it uses a free instance, so this may delay requests by a few seconds occasionally.

## Download the mobile app
The mobile app is available for download on the Google Play Store: https://play.google.com/store/apps/details?id=com.mkdevs.privvy

## Setup

To set up this project, follow these steps:

1. Install Node.js
   - Download and install Node.js from https://nodejs.org/

2. Set up Firebase Admin SDK
   - Create a new Firebase project at https://console.firebase.google.com/
   - Enable the Firebase Admin SDK in your project
   - Generate a service account key JSON file
   - Place the `firebase_admin_cert.json` file in the root directory of this project

3. Install dependencies
   - Run `npm install` in the root directory of this project

4. Start the application

## Endpoints

### 1. POST /generateColorVariations

This endpoint generates color variations of an image stored in Google Cloud Storage.

- Request Body:
  - `uid`: User ID, essentially a firebase auth userid (required)
  - `auto_id`: Auto-generated ID (required)
  - `target_path`: Path to the image in Google Cloud Storage (required)

- Response:
  - Returns an object containing:
    - `message`: Success message
    - `colors`: Array of color variations
    - `images`: Array of generated image paths
    - `imageUrls`: Array of signed URLs for the generated images
  
### 2. DELETE /deleteVariations

This endpoint deletes all files within a specified directory in Google Cloud Storage.

- Request Body:
  - `uid`: User ID, essentially a firebase auth userid (required)
  - `auto_id`: Auto-generated ID (required)
  - `target_path`: Path to the directory in Google Cloud Storage (required)

- Response:
  - Returns a success message if the deletion was successful

## Additional Notes

- The application uses Firebase Admin SDK for authentication and database operations.
- Image processing is handled using Jimp library.
- All endpoints require authentication via Firebase Admin SDK.

For more detailed information about each function, please refer to the source code.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## Mobile App Repo
You can also give the mobile app repo a visit and see if you can help out with any issues or feature requests.
https://github.com/michealgabriel/privvy-mobile

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.