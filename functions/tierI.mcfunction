scoreboard objectives add enchanting dummy enchanting
scoreboard players random @s enchanting 0 10
execute @s[scores={enchanting=0}] ~ ~ ~ structure load depthstrider4 ~ ~ ~
execute @s[scores={enchanting=1}] ~ ~ ~ structure load sharpness6 ~ ~ ~
execute @s[scores={enchanting=2}] ~ ~ ~ structure load fortune4 ~ ~ ~
execute @s[scores={enchanting=3}] ~ ~ ~ structure load efficiency6 ~ ~ ~
execute @s[scores={enchanting=4}] ~ ~ ~ structure load frostwalker3 ~ ~ ~
execute @s[scores={enchanting=5}] ~ ~ ~ structure load lure4 ~ ~ ~
execute @s[scores={enchanting=6}] ~ ~ ~ structure load luckofthesea4 ~ ~ ~
execute @s[scores={enchanting=7}] ~ ~ ~ structure load protection5 ~ ~ ~
execute @s[scores={enchanting=8}] ~ ~ ~ structure load respiration4 ~ ~ ~
execute @s[scores={enchanting=9}] ~ ~ ~ structure load thorns5 ~ ~ ~
execute @s[scores={enchanting=10}] ~ ~ ~ structure load unbreaking5 ~ ~ ~
scoreboard players reset * enchanting