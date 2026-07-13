let users = [];

export function createUser(user) {
  users.push(user);
  return user;
}

export function findUserByMobile(mobile) {
  return users.find(u => u.mobile === mobile);
}