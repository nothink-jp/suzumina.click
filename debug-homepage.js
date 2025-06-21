/**
 * Debug script to test homepage Server Actions
 * This will help us understand why the homepage carousel data is failing
 */

const { Firestore } = require("@google-cloud/firestore");

async function testHomepageActions() {
  console.log("🔍 Testing Homepage Server Actions...");

  try {
    // Initialize Firestore with the same configuration as the app
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click";
    console.log(`Using project ID: ${projectId}`);

    const firestore = new Firestore({
      projectId,
      ignoreUndefinedProperties: true,
    });

    // Test 1: Check if dlsiteWorks collection exists and has data
    console.log("\n📊 Testing dlsiteWorks collection...");
    const worksSnapshot = await firestore
      .collection("dlsiteWorks")
      .limit(5)
      .get();
    console.log(`dlsiteWorks collection size: ${worksSnapshot.size}`);

    if (worksSnapshot.size > 0) {
      const firstWork = worksSnapshot.docs[0];
      console.log("First work data:", {
        id: firstWork.id,
        productId: firstWork.data().productId,
        title: firstWork.data().title,
      });
    }

    // Test 2: Test the actual getWorks logic (mimicking the Server Action)
    console.log("\n🔄 Testing getWorks logic...");

    // Get all works (same as in the Server Action)
    const allSnapshot = await firestore.collection("dlsiteWorks").get();
    console.log(`All works fetched: ${allSnapshot.size} items`);

    if (allSnapshot.size === 0) {
      console.log("❌ No works found in dlsiteWorks collection");
      return;
    }

    // Convert to array and sort (same logic as Server Action)
    const allWorks = allSnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));

    // Sort by DLsite ID (same logic as Server Action)
    allWorks.sort((a, b) => {
      const aId = a.productId;
      const bId = b.productId;

      // String length comparison (longer is newer)
      if (aId.length !== bId.length) {
        return bId.length - aId.length;
      }

      // Same length: lexicographic descending
      return bId.localeCompare(aId);
    });

    // Get first 10 (same as homepage limit)
    const top10Works = allWorks.slice(0, 10);
    console.log(`Top 10 works after sorting:`);
    top10Works.forEach((work, index) => {
      console.log(`  ${index + 1}. ${work.productId} - ${work.title}`);
    });

    // Test 3: Check videos collection
    console.log("\n📹 Testing videos collection...");
    const videosSnapshot = await firestore
      .collection("videos")
      .orderBy("publishedAt", "desc")
      .limit(10)
      .get();
    console.log(`Videos collection size: ${videosSnapshot.size}`);

    if (videosSnapshot.size > 0) {
      const firstVideo = videosSnapshot.docs[0];
      console.log("First video data:", {
        id: firstVideo.id,
        videoId: firstVideo.data().videoId,
        title: firstVideo.data().title,
        publishedAt: firstVideo.data().publishedAt,
      });
    }

    console.log("\n✅ Debug completed successfully");
  } catch (error) {
    console.error("❌ Debug error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
  }
}

// Run the test
testHomepageActions();
