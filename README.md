This project uses the [Minecraft Bedrock Javascript API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/?view=minecraft-bedrock-stable) to create custom spells
and other effects in the game.

Features include:
- Custom weapon effects
- Custom armor effects
- New gear to obtain
- Health displayed below player name tags
- Lucky blocks with custom actions/loot drops

How to use:
- Clone this repository into a new folder in the directory for minecraft bedrock development behavior packs
  * (windows) "%LOCALAPPDATA%/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang/development_behavior_packs"
  * Other paths can be found [here](https://wiki.bedrock.dev/guide/project-setup.html).
- Clone the corresponding [Resource Pack](https://github.com/tracevd/mc_ench_mod_rp) into a new folder at the same path except the path would end with "development_resource_packs" rather than "development_behavior_packs"
- The final structure should have the development_(resource|behavior)_packs/your_new_folder with its contents being the cloned repository.
- Then, when creating a new world you can add both the behavior pack and resource pack to the world.