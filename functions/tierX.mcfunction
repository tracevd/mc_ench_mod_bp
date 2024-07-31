scoreboard objectives add enchanting dummy enchanting
scoreboard players random @s enchanting 0 9
execute at @s[scores={enchanting=0}] run structure load protection10 ~ ~ ~
execute at @s[scores={enchanting=1}] run structure load sharpness10 ~ ~ ~
execute at @s[scores={enchanting=2}] run structure load fortune10 ~ ~ ~
execute at @s[scores={enchanting=3}] run structure load efficiency10 ~ ~ ~
execute at @s[scores={enchanting=4}] run structure load respiration10 ~ ~ ~
execute at @s[scores={enchanting=6}] run structure load unbreaking10 ~ ~ ~
execute at @s[scores={enchanting=7}] run structure load looting5 ~ ~ ~
execute at @s[scores={enchanting=8}] run structure load featherfalling10 ~ ~ ~
execute at @s[scores={enchanting=9}] run structure load thorns10 ~ ~ ~
scoreboard players reset * enchanting
