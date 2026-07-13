import jwt from "jsonwebtoken";

const SECRET = "SUPER_SECRET_KEY";

export async function GET({ request }) {
  const auth = request.headers.get("authorization");

  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const token = auth.split(" ")[1];
    const user = jwt.verify(token, SECRET);
    return new Response(JSON.stringify(user));
  } catch {
    return new Response("Invalid token", { status: 401 });
  }
}