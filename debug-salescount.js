const { Firestore } = require("@google-cloud/firestore");

async function checkSalesCountData() {
	const firestore = new Firestore({
		projectId: "suzumina-click",
		ignoreUndefinedProperties: true,
	});

	try {
		console.log("Checking salesCount data in Firestore...");

		// Get first 5 documents from works collection
		const worksSnapshot = await firestore.collection("works").limit(5).get();

		console.log(`Found ${worksSnapshot.size} documents`);

		worksSnapshot.forEach((doc) => {
			const data = doc.data();
			console.log(`\nDocument ID: ${doc.id}`);
			console.log(`Product ID: ${data.productId || "N/A"}`);
			console.log(`Title: ${data.title || "N/A"}`);
			console.log(`Sales Count: ${data.salesCount !== undefined ? data.salesCount : "undefined"}`);
			console.log(`Sales Count type: ${typeof data.salesCount}`);

			// Check if salesCount is 0
			if (data.salesCount === 0) {
				console.log("⚠️  Found document with salesCount = 0");
			}
		});

		// Also check for documents with salesCount = 0 specifically
		const zeroSalesSnapshot = await firestore
			.collection("works")
			.where("salesCount", "==", 0)
			.limit(3)
			.get();
		console.log(`\nFound ${zeroSalesSnapshot.size} documents with salesCount = 0`);

		zeroSalesSnapshot.forEach((doc) => {
			const data = doc.data();
			console.log("\nZero Sales Document:");
			console.log(`Product ID: ${data.productId}`);
			console.log(`Title: ${data.title}`);
			console.log(`Sales Count: ${data.salesCount}`);
		});
	} catch (error) {
		console.error("Error checking Firestore data:", error);
	}
}

checkSalesCountData();
