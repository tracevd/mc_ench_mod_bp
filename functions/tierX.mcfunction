scoreboard objectives add enchanting dummy enchanting
scoreboard players random @s enchanting 0 9
execute @s[scores={enchanting=0}] ~ ~ ~ structure load protection10 ~ ~ ~
execute @s[scores={enchanting=1}] ~ ~ ~ structure load sharpness10 ~ ~ ~
execute @s[scores={enchanting=2}] ~ ~ ~ structure load fortune10 ~ ~ ~
execute @s[scores={enchanting=3}] ~ ~ ~ structure load efficiency10 ~ ~ ~
execute @s[scores={enchanting=4}] ~ ~ ~ structure load respiration10 ~ ~ ~
execute @s[scores={enchanting=6}] ~ ~ ~ structure load unbreaking10 ~ ~ ~
execute @s[scores={enchanting=7}] ~ ~ ~ structure load looting5 ~ ~ ~
execute @s[scores={enchanting=8}] ~ ~ ~ structure load featherfalling10 ~ ~ ~
execute @s[scores={enchanting=9}] ~ ~ ~ structure load thorns10 ~ ~ ~
scoreboard players reset * enchanting
