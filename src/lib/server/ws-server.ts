import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8081 });

console.log("WebSocket running on ws://localhost:8081");

let clients: any[] = [];

wss.on("connection", (socket) => {

    socket.on("message", (msg) => {

        const data = JSON.parse(msg.toString());

        if (data.type === "auth") {
            clients.push({ socket, token: data.token });
        }

        if (data.type === "message") {
            clients.forEach(c => {
                c.socket.send(JSON.stringify({
                    type: "message",
                    message: data.message
                }));
            });
        }

        if (data.type === "typing") {
            clients.forEach(c => {
                c.socket.send(JSON.stringify({
                    type: "typing",
                    mobile: data.mobile
                }));
            });
        }

    });

    socket.on("close", () => {
        clients = clients.filter(c => c.socket !== socket);
    });

});

export default wss;