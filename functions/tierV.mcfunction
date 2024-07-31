scoreboard objectives add enchanting dummy enchanting
scoreboard players random @s enchanting 0 9
execute at @s[scores={enchanting=0}] run structure load protection7 ~ ~ ~
execute at @s[scores={enchanting=1}] run structure load sharpness7 ~ ~ ~
execute at @s[scores={enchanting=2}] run structure load fortune7 ~ ~ ~
execute at @s[scores={enchanting=3}] run structure load efficiency7 ~ ~ ~
execute at @s[scores={enchanting=4}] run structure load knockback3 ~ ~ ~
execute at @s[scores={enchanting=5}] run structure load respiration7 ~ ~ ~
execute at @s[scores={enchanting=6}] run structure load thorns8 ~ ~ ~
execute at @s[scores={enchanting=7}] run structure load unbreaking7 ~ ~ ~
execute at @s[scores={enchanting=8}] run structure load looting5 ~ ~ ~
execute at @s[scores={enchanting=9}] run structure load featherfalling7 ~ ~ ~
scoreboard players reset * enchanting