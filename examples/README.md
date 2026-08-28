# examples/

`graveyard/` is a mod broken on purpose. Run the checker against it to see what
the output looks like before you point it at your own work:

    node bin/coe5-modcheck.js examples/graveyard

It carries one of each interesting mistake: a weapon used before it is defined, a
misspelled monster name, a command missing an argument, a recruitment condition
missing its sigil, an unknown monster inside a summon string, a command applied
to the wrong thing, and an image the mod names but does not include.
