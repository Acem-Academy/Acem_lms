const mongoose = require("mongoose");
const path = require("path");

const SERVER = path.resolve(__dirname, "..", "..");

require(path.join(SERVER, "node_modules/dotenv")).config({
    path: path.join(SERVER, ".env"),
});

const User = require(path.join(SERVER, "src", "models", "User"));

/*
|--------------------------------------------------------------------------
| One-shot backfill: give pre-existing users an explicit status
|--------------------------------------------------------------------------
|
| Users created before `constants/status.js` was populated have no `status`
| field at all, because the schema default resolved to `undefined`. The login
| guard in auth.service.js compares `user.status !== STATUS.ACTIVE`, which is
| why those accounts must be given "active" before the new constants ship.
|
| The filter matches ONLY documents whose status is missing or null, so an
| account already marked "inactive" is never resurrected. Re-running is safe:
| a second pass matches zero documents.
|
*/

const BACKFILL_FILTER = {
    $or: [
        { status: { $exists: false } },
        { status: null },
    ],
};

const EXPECTED_MATCHES = Number(
    process.env.EXPECTED_MATCHES || 8
);

const backfillUserStatus = async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected");

    const matched = await User.countDocuments(
        BACKFILL_FILTER
    );

    console.log(
        `Documents needing status: ${matched}`
    );
    console.log(
        `Expected: ${EXPECTED_MATCHES}`
    );

    /*
    | Re-running the backfill after a successful pass matches zero documents.
    | That is the expected idempotent outcome, not a failure, so it is
    | reported and exited cleanly instead of aborting.
    */
    if (matched === 0) {
        console.log(
            "Nothing to do: every user already has a status. No documents were modified."
        );
        await mongoose.disconnect();
        process.exit(0);
    }

    if (matched !== EXPECTED_MATCHES) {
        console.error(
            "ABORTED: matched count differs from the expected count. No documents were modified."
        );
        await mongoose.disconnect();
        process.exit(1);
    }

    const result = await User.updateMany(
        BACKFILL_FILTER,
        { $set: { status: "active" } }
    );

    console.log(
        `matchedCount: ${result.matchedCount}`
    );
    console.log(
        `modifiedCount: ${result.modifiedCount}`
    );

    const stillMissing = await User.countDocuments(
        BACKFILL_FILTER
    );

    console.log(
        `Documents still missing status: ${stillMissing}`
    );

    const distribution = await User.aggregate([
        { $group: { _id: "$status", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
    ]);

    console.log(
        "Final status distribution:",
        JSON.stringify(distribution)
    );

    if (stillMissing !== 0) {
        console.error(
            "FAILED: some documents are still missing a status."
        );
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log("Backfill complete");

    await mongoose.disconnect();
    process.exit(0);
};

backfillUserStatus();