const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand
} = require('@aws-sdk/client-s3');


class R2Service {

    static client = new S3Client({

        region: 'auto',

        endpoint:
            `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,

        credentials: {

            accessKeyId:
                process.env.R2_ACCESS_KEY_ID,

            secretAccessKey:
                process.env.R2_SECRET_ACCESS_KEY
        }
    });


    static bucket =
        process.env.R2_BUCKET_NAME;


    static publicUrl =
        process.env.R2_PUBLIC_URL;


    // ============================================================
    // UPLOAD
    // ============================================================

    static async upload(
        key,
        buffer,
        contentType
    ) {

        await this.client.send(
            new PutObjectCommand({

                Bucket:
                    this.bucket,

                Key:
                    key,

                Body:
                    buffer,

                ContentType:
                    contentType
            })
        );

        return {
            key,

            url:
                `${this.publicUrl}/${key}`
        };
    }


    // ============================================================
    // DELETE
    // ============================================================

    static async delete(key) {

        if (!key) {
            return;
        }

        await this.client.send(
            new DeleteObjectCommand({

                Bucket:
                    this.bucket,

                Key:
                    key
            })
        );
    }
}


module.exports = R2Service;