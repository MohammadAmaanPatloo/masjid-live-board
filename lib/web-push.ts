import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

if (!publicKey) {
  throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing.");
}

if (!privateKey) {
  throw new Error("VAPID_PRIVATE_KEY is missing.");
}

if (!subject) {
  throw new Error("VAPID_SUBJECT is missing.");
}

webpush.setVapidDetails(
  subject,
  publicKey,
  privateKey
);

export default webpush;