// functions/src/index.ts
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Import and re-export functions from their modules
export { discordAuthCallback } from "./discordAuth";
export { fetchYouTubeVideos } from "./youtube";

// You can add other functions or configurations here if needed in the future.
