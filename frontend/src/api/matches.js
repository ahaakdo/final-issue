import http from "@/utils/http";

export function getClassicMatches() {
  return http.get("/classic-matches");
}

export function createClassicMatch(data) {
  return http.post("/classic-matches", data);
}


