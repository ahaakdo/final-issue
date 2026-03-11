import http from "@/utils/http";

export function getRioPlayers() {
  return http.get("/rio-players");
}

export function createRioPlayer(data) {
  return http.post("/rio-players", data);
}

export function updateRioPlayer(id, data) {
  return http.put(`/rio-players/${id}`, data);
}


