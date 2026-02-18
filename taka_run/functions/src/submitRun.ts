import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {Constants} from "./constants";
import {validateRun, RunData} from "./validation";

const db = admin.firestore();

export const submitRun = functions.https.onCall(async (data, context) => {
  // Debug logging
  functions.logger.info("submitRun called", {
    hasContext: !!context,
    hasAuth: !!context?.auth,
    authUid: context?.auth?.uid ?? "NO_AUTH",
    dataKeys: data ? Object.keys(data) : "NO_DATA",
  });

  // Require authentication
  if (!context.auth) {
    functions.logger.error("Auth is null — rejecting call");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in to submit a run."
    );
  }

  const uid = context.auth.uid;
  const runData = data as RunData;

  // Rate limit: max runs per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const runsToday = await db
    .collection("runs")
    .where("userId", "==", uid)
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(todayStart))
    .count()
    .get();

  if (runsToday.data().count >= Constants.maxRunsPerDay) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      `Maximum ${Constants.maxRunsPerDay} runs per day reached.`
    );
  }

  // Validate the run
  const validation = validateRun(runData);
  const tkEarned = validation.valid ? runData.distance * Constants.tkPerKm : 0;
  const pace = runData.distance > 0 ? (runData.duration / 60) / runData.distance : 0;
  const status = validation.valid ? "validated" : "rejected";

  // Write run document
  const runRef = db.collection("runs").doc();
  await runRef.set({
    userId: uid,
    distance: runData.distance,
    duration: runData.duration,
    pace: Math.round(pace * 100) / 100,
    tkEarned,
    status,
    validationErrors: validation.errors,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Store GPS points in subcollection (batched in chunks of 400)
  if (runData.gpsPoints && runData.gpsPoints.length > 0) {
    const chunkSize = 400;
    for (let i = 0; i < runData.gpsPoints.length; i += chunkSize) {
      const chunk = runData.gpsPoints.slice(i, i + chunkSize);
      const batch = db.batch();
      for (const point of chunk) {
        const pointRef = runRef.collection("gpsPoints").doc();
        batch.set(pointRef, point);
      }
      await batch.commit();
    }
  }

  // If validated, update user stats
  if (validation.valid) {
    const userRef = db.collection("users").doc(uid);
    await userRef.set(
      {
        tkBalance: admin.firestore.FieldValue.increment(tkEarned),
        totalDistance: admin.firestore.FieldValue.increment(runData.distance),
        totalRuns: admin.firestore.FieldValue.increment(1),
      },
      {merge: true}
    );
  }

  // Return result matching RunResult.fromMap() in firebase_run_service.dart
  return {
    runId: runRef.id,
    validated: validation.valid,
    tkEarned,
    errors: validation.errors,
  };
});
