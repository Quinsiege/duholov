package ru.duholov.game

import android.app.Activity
import org.json.JSONObject

/** 11: сборка без Google Play — покупок через Google Play нет (Казна платит через ЮKassa на сайте игры) */
@Suppress("UNUSED_PARAMETER")
class Billing(act: Activity, private val send: (JSONObject) -> Unit) {
    private fun no(op: String) = send(JSONObject().put("type", "error").put("op", op).put("code", 3).put("message", "no billing"))
    fun products(ids: List<String>) = no("products")
    fun buy(id: String, acct: String) = no("buy")
    fun pending() = no("pending")
    fun end() {}
}
