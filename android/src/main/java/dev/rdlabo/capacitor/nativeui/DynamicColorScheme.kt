package dev.rdlabo.capacitor.nativeui

import android.content.Context
import android.content.res.Configuration
import android.os.Build
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.ui.graphics.toArgb
import com.getcapacitor.JSObject

internal object DynamicColorScheme {
    fun read(context: Context): JSObject {
        val dark = (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        val result = JSObject().put("available", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S).put("systemDark", dark)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            result.put("light", roles(dynamicLightColorScheme(context)))
            result.put("dark", roles(dynamicDarkColorScheme(context)))
        }
        return result
    }

    private fun roles(scheme: ColorScheme): JSObject {
        val result = JSObject()
        mapOf(
            "primary" to scheme.primary,
            "onPrimary" to scheme.onPrimary,
            "primaryContainer" to scheme.primaryContainer,
            "onPrimaryContainer" to scheme.onPrimaryContainer,
            "inversePrimary" to scheme.inversePrimary,
            "secondary" to scheme.secondary,
            "onSecondary" to scheme.onSecondary,
            "secondaryContainer" to scheme.secondaryContainer,
            "onSecondaryContainer" to scheme.onSecondaryContainer,
            "tertiary" to scheme.tertiary,
            "onTertiary" to scheme.onTertiary,
            "tertiaryContainer" to scheme.tertiaryContainer,
            "onTertiaryContainer" to scheme.onTertiaryContainer,
            "error" to scheme.error,
            "onError" to scheme.onError,
            "errorContainer" to scheme.errorContainer,
            "onErrorContainer" to scheme.onErrorContainer,
            "surface" to scheme.surface,
            "onSurface" to scheme.onSurface,
            "surfaceVariant" to scheme.surfaceVariant,
            "onSurfaceVariant" to scheme.onSurfaceVariant,
            "surfaceTint" to scheme.surfaceTint,
            "inverseSurface" to scheme.inverseSurface,
            "inverseOnSurface" to scheme.inverseOnSurface,
            "outline" to scheme.outline,
            "outlineVariant" to scheme.outlineVariant,
            "scrim" to scheme.scrim,
            "surfaceBright" to scheme.surfaceBright,
            "surfaceDim" to scheme.surfaceDim,
            "surfaceContainer" to scheme.surfaceContainer,
            "surfaceContainerHigh" to scheme.surfaceContainerHigh,
            "surfaceContainerHighest" to scheme.surfaceContainerHighest,
            "surfaceContainerLow" to scheme.surfaceContainerLow,
            "surfaceContainerLowest" to scheme.surfaceContainerLowest,
            "primaryFixed" to scheme.primaryFixed,
            "primaryFixedDim" to scheme.primaryFixedDim,
            "onPrimaryFixed" to scheme.onPrimaryFixed,
            "onPrimaryFixedVariant" to scheme.onPrimaryFixedVariant,
            "secondaryFixed" to scheme.secondaryFixed,
            "secondaryFixedDim" to scheme.secondaryFixedDim,
            "onSecondaryFixed" to scheme.onSecondaryFixed,
            "onSecondaryFixedVariant" to scheme.onSecondaryFixedVariant,
            "tertiaryFixed" to scheme.tertiaryFixed,
            "tertiaryFixedDim" to scheme.tertiaryFixedDim,
            "onTertiaryFixed" to scheme.onTertiaryFixed,
            "onTertiaryFixedVariant" to scheme.onTertiaryFixedVariant,
        ).forEach { (role, color) ->
            result.put(role, "#" + Integer.toHexString(color.toArgb() and 0xffffff).padStart(6, '0'))
        }
        return result
    }
}
