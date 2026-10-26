const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcrypt");

const SERVER = path.resolve(__dirname, "..", "..");

require("dotenv").config({
    path: path.join(SERVER, ".env"),
});

const User = require(path.join(SERVER, "src", "models", "User"));
const ROLES = require(path.join(SERVER, "src", "constants", "roles"));
const STATUS = require(path.join(SERVER, "src", "constants", "status"));

/*
|--------------------------------------------------------------------------
| Seed an admin user if one does not already exist.
|--------------------------------------------------------------------------
|
| This script reads ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_FULL_NAME from
| the environment and creates an admin user with the given credentials.
| If an admin user with that email already exists, the script logs a
| safe message and exits without making any changes.
| The script does not expose passwords in its output and does not
| modify any other data.
*/

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || "System Administrator";

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
        "ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set."
    );
    process.exit(1);
}

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const email = normalizeEmail(ADMIN_EMAIL);
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            if (existingUser.role === ROLES.ADMIN) {
                console.log(
                    `Admin user with email "${email}" already exists. No changes made.`
                );
            } else {
                console.log(
                    `User with email "${email}" already exists with role "${existingUser.role}". No changes made.`
                );
            }
            await mongoose.disconnect();
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

        const adminUser = new User({
            fullName: ADMIN_FULL_NAME,
            email: email,
            password: passwordHash,
            role: ROLES.ADMIN,
            status: STATUS.ACTIVE,
            isEmailVerified: true,
        });

        await adminUser.save();
        console.log(
            `Admin user "${adminUser.fullName}" (email: ${adminUser.email}) created successfully.`
        );

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("Error seeding admin user:", error.message);
        try {
            await mongoose.disconnect();
        } catch (_) {}
        process.exit(1);
    }
};

seedAdmin();
