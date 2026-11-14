# Survival path maps and shopkeepers

Batch 7 includes six 16:9 setting-specific path backdrops and a 5 × 2 transparent sheet of the ten requested node symbols. S4 includes six 4:5 shopkeeper portraits under the corresponding keeper IDs. The Machine Works Smetanita trader is a woman automaton. The earlier three shop portraits remain in the art library.

The numbered Batch 7 supplement was absent from the checked branches. Setting art follows the six settings in the Survival design spec, and the marker order follows its ten node kinds. The [manifest](manifest.json) records source renders, prompts, reference paths, native and export sizes, and image hashes. The [marker layout](marker-layout.json) lists individual PNG exports and their zero-based atlas cells.

[Path backdrops](review/path-backdrops.jpg) · [Shopkeepers](review/shopkeepers.jpg) · [32 px markers](review/markers-32px.jpg)

The asset build exports the path backdrops as `survival-path-<setting>`, the portraits as `keeper-<setting>`, the marker sheet as `survival-path-node-markers`, and individual markers as `survival-node-<kind>`. The separate Survival gameplay implementation can bind those keys. This delivery records the art as review candidates.
