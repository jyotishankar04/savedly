async function test() {
  const token = await require("fs").promises.readFile("/tmp/memora-token", "utf8").catch(() => null);
  console.log("Token:", !!token);
}
test();
