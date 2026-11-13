# wetware
Cyberpunk Roguelite

An action roguelite seen from above, set in the monsoon city of Saltreach. You play Kestrel, a courier who carries the Package up the Corwen Stack, dies, and wakes on Mother Ruen's table with new hardware in her body.

## Run it

Open `index.html` in a browser. No build step and no server needed. The only network request is Google Fonts. Sound starts muted: click "Enable sound".

## Controls

| Action | Input |
| --- | --- |
| Move / aim | WASD / mouse |
| Attack / special | Left / right mouse button |
| Dash | Space |
| Courier skill (tag drone, fan fire or grapple) | Q |
| Vent heat | E |
| Active implant | F |
| Body grid | Tab |

A gamepad also works.

## Couriers

Talk to the other couriers in the clinic to play as them.

- **Kestrel**, courier: quick blink dash, tag drone, arc baton
- **Vesper Quill**, gunhand: two rolls that load hot shots, fan fire, twin pistols
- **Bram Tolliver**, breaker: shoulder ram, grapple and throw, piston gauntlets, thrives in redline

## Debug URLs

- `?auto=1` lets a bot play a full run
- `?seed=<n>` fixes the random seed
- `?state=hub|area1|boss1|area2|boss2|grid|end` jumps to a point in the game
- `?view=wide|kestrel|boss1|boss2` sets a fixed camera
- `?t=<seconds>` freezes time
- `?char=kestrel|vesper|bram` picks the courier
- `?weapon=baton|carbine|hammer|whip|blades|spear|rivet` picks the weapon
- `?door=shrine|risk` forces a door reward
- `?fresh=1` clears the save
- `?meta=fresh|mid|full` sets the meta progress

## Credits

Rendered with [three.js](https://threejs.org) r186 (MIT licence), bundled locally in `lib/`. All art and sound are generated in code.
