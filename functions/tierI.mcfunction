scoreboard objectives add enchanting dummy enchanting
scoreboard players random @s enchanting 0 10
execute at @s[scores={enchanting=0}] run structure load depthstrider4 ~ ~ ~
execute at @s[scores={enchanting=1}] run structure load sharpness6 ~ ~ ~
execute at @s[scores={enchanting=2}] run structure load fortune4 ~ ~ ~
execute at @s[scores={enchanting=3}] run structure load efficiency6 ~ ~ ~
execute at @s[scores={enchanting=4}] run structure load frostwalker3 ~ ~ ~
execute at @s[scores={enchanting=5}] run structure load lure4 ~ ~ ~
execute at @s[scores={enchanting=6}] run structure load luckofthesea4 ~ ~ ~
execute at @s[scores={enchanting=7}] run structure load protection5 ~ ~ ~
execute at @s[scores={enchanting=8}] run structure load respiration4 ~ ~ ~
execute at @s[scores={enchanting=9}] run structure load thorns5 ~ ~ ~
execute at @s[scores={enchanting=10}] run structure load unbreaking5 ~ ~ ~
scoreboard players reset * enchanting