#!/usr/bin/env kotlin

@file:Repository("https://repo.maven.apache.org/maven2/")
@file:DependsOn("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")

import java.io.File
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

val jsonFile = requireNotNull(args[0]) { "JSON file must be provided" }.let { File(it) }
val segments = Json.parseToJsonElement(jsonFile.readText()).jsonObject.entries.toList()
val startIndex = args.getOrNull(1)?.let { it.toInt() } ?: 0
val endIndex = args.getOrNull(2)?.let { it.toInt() } ?: segments.size
val indexStep = args.getOrNull(3)?.let { it.toInt() } ?: 1
val remotionArgs = if (args.size > 4) args.toList().subList(4, args.size) else emptyList()

for (index in startIndex ..< endIndex step indexStep) {
    val (segmentKey, segmentElement) = segments[index]
    val segment = segmentElement.jsonObject
    val trivial = segment["trivial"]?.jsonPrimitive?.boolean ?: false
    if (trivial) {
        continue
    }
    val state = segment["state"]?.toString() ?: "{}"
    val end = segment["end"]?.toString() ?: "{}"
    println("Rendering #$index: $segmentKey")
    ProcessBuilder(
            listOf(
                "npx",
                "remotion",
                "render",
                "Vnmark",
                "--props={\"state\":$state,\"end\":$end}",
                "--color-space=bt709",
                "--image-format=png",
                "--timeout=7200000",
                "--concurrency=5",
                "out/$segmentKey.mp4",
            ) + remotionArgs
        )
        .inheritIO()
        .start()
        .waitFor()
}
