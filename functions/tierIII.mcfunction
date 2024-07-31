scoreboard objectives add enchanting dummy enchanting
scoreboard players random @s enchanting 0 13
execute at @s[scores={enchanting=0}] run structure load depthstrider5 ~ ~ ~
execute at @s[scores={enchanting=1}] run structure load sharpness7 ~ ~ ~
execute at @s[scores={enchanting=2}] run structure load fortune5 ~ ~ ~
execute at @s[scores={enchanting=3}] run structure load efficiency7 ~ ~ ~
execute at @s[scores={enchanting=4}] run structure load knockback3 ~ ~ ~
execute at @s[scores={enchanting=5}] run structure load lure4 ~ ~ ~
execute at @s[scores={enchanting=6}] run structure load luckofthesea4 ~ ~ ~
execute at @s[scores={enchanting=7}] run structure load protection6 ~ ~ ~
execute at @s[scores={enchanting=8}] run structure load respiration5 ~ ~ ~
execute at @s[scores={enchanting=9}] run structure load thorns5 ~ ~ ~
execute at @s[scores={enchanting=10}] run structure load unbreaking5 ~ ~ ~
execute at @s[scores={enchanting=11}] run structure load punch3 ~ ~ ~
execute at @s[scores={enchanting=12}] run structure load looting4 ~ ~ ~
execute at @s[scores={enchanting=13}] run structure load quickcharge4 ~ ~ ~
scoreboard players reset * enchanting