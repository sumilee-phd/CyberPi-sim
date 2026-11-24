// Map caps, lenses, sockets and their sibling meshes to the same functional part.
const names = [
  ['a',/^button_a(?:_|$)/], ['b',/^button_b(?:_|$)/],
  ['joystick',/^joystick(?:_|$)/], ['display',/^(?:screen|lcd|display|fpc)(?:_|$)/],
  ['led',/^led(?:_|$)/], ['light',/^light_sensor(?:_|$)/],
  ['mic',/^microphone(?:_|$)/], ['usb',/^usb(?:_|$)/],
  ['home',/^home(?:_|$)/], ['speaker',/^speaker(?:_|$)/]
];
export function identifyPart(object) {
  for(let node=object;node;node=node.parent){
    const match=names.find(([,pattern])=>pattern.test(node.name));
    if(match)return match[0];
  }
  return null;
}
export function firstFunctionalHit(intersections){
  for(const intersection of intersections){const part=identifyPart(intersection.object);if(part)return {part,intersection};}
  return null;
}
