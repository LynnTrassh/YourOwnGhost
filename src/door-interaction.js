// The art loader hides the greybox mesh after replacing its appearance.
// Keep that mesh as the interaction proxy, independently of render visibility.
export function targetsBedroomDoor(ray, world, state) {
  if (!state.player.standing || state.doors.bedroom.open || !world.door) return false;
  const hit = ray.intersectObjects([...world.solids, world.door], false)[0];
  return hit?.object === world.door;
}
