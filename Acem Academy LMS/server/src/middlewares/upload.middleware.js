const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",

        "application/pdf",

        "video/mp4",
        "video/webm",
        "video/quicktime",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(
            new Error(
                "Unsupported file type."
            ),
            false
        );
    }

    cb(null, true);
};

const upload = multer({
    storage,

    limits: {
        fileSize: 100 * 1024 * 1024,
    },

    fileFilter,
});

module.exports = upload;