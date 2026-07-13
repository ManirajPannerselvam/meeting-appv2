import { json } from "@sveltejs/kit";
import { getUsers, saveUsers } from "$lib/server/storage/storage";

export async function POST({ request }) {
  const { name, mobile, password } = await request.json();

  const users = getUsers();

  const exists = users.find(u => u.mobile === mobile);

  if (exists) {
    return json({ error: "User already exists" }, { status: 400 });
  }

  users.push({
    id: Date.now(),
    name,
    mobile,
    password,
    role: "user"
  });

  saveUsers(users);

  return json({ success: true });
}