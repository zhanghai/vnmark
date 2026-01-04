#!/usr/bin/env kotlin

@file:Repository("https://repo.maven.apache.org/maven2/")
@file:DependsOn("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")

import java.io.File
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

val jsonFile = requireNotNull(args[0]) { "JSON file must be provided" }.let { File(it) }
val startIndex = args.getOrNull(1)?.let { it.toInt() } ?: 0

val segments = Json.parseToJsonElement(jsonFile.readText()).jsonObject

segments.entries.forEachIndexed { index, (segmentKey, segmentElement) ->
    if (index < startIndex) {
        return@forEachIndexed
    }
    val segment = segmentElement.jsonObject
    val trivial = segment["trivial"]?.jsonPrimitive?.boolean ?: false
    if (trivial) {
        return@forEachIndexed
    }
    val state = segment["state"]?.toString() ?: "{}"
    val end = segment["end"]?.toString() ?: "{}"
    println("Rendering #$index: $segmentKey")
    ProcessBuilder(
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
    )
        .inheritIO()
        .start()
        .waitFor()
    return@forEachIndexed
}
