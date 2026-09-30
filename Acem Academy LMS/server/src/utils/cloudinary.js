const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (
    buffer,
    options = {}
) => {

    return new Promise((resolve, reject) => {

        const uploadStream =
            cloudinary.uploader.upload_stream(
                {
                    resource_type:
                        options.resourceType || "auto",

                    folder:
                        options.folder || "acem-academy",

                    ...options,
                },

                (error, result) => {

                    if (error) {
                        return reject(error);
                    }

                    resolve(result);
                }
            );

        uploadStream.end(buffer);
    });
};

module.exports = {
    uploadToCloudinary,
};