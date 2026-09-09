const threadId = "some-id"; 
async function test() {
  const login = await fetch("http://localhost:4000/api/v1/auth/login", {
     // I don't know the login. Let's just create a thread with no auth? Wait, the server needs auth.
  });
}
