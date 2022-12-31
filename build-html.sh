#!/bin/bash

p1='export default `'
p2="$(cat ./src/resources/land.html)"
p2clean="${p2//\\/\\\\\\\\}"
p3='` as string;'

echo "$p1$p2clean$p3" > ./src/resources/html.ts