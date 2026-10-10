// Include horns, stretched legs and the charging pose in the protected volume.
export const COW_CAMERA_RADIUS = 2.65;
export const CAMERA_MAX_LAG = .45;
export const CAMERA_SCREEN_MARGIN = .78;

export function followTarget(previous, player, seconds, immediate = false) {
  const alpha = immediate ? 1 : 1 - Math.exp(-Math.max(0, seconds) * 16);
  let x = previous.x + (player.x - previous.x) * alpha;
  let z = previous.z + (player.z - previous.z) * alpha;
  const dx = x - player.x, dz = z - player.z, lag = Math.hypot(dx, dz);
  // Input can advance the simulation between rendered frames. Enforce this
  // bound even when the next render receives almost no elapsed time.
  if (lag > CAMERA_MAX_LAG) {
    x = player.x + dx / lag * CAMERA_MAX_LAG;
    z = player.z + dz / lag * CAMERA_MAX_LAG;
  }
  return { x, y: 1.15, z };
}

export function cameraDistance(requested, aspect, fov = 45) {
  const halfAngle = Math.atan(Math.tan(fov * Math.PI / 360) * Math.min(1, Math.max(.1, aspect)) * CAMERA_SCREEN_MARGIN);
  const minimum = (COW_CAMERA_RADIUS + CAMERA_MAX_LAG) / Math.sin(halfAngle);
  return Math.max(requested, minimum);
}
