package ru.duholov.game

import android.app.Activity
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import org.json.JSONArray
import org.json.JSONObject

/**
 * 11: Казна в версии для Google Play — покупки только через Google Play Billing (правило Google для цифровых товаров).
 * Приложение лишь проводит покупку; засчитывает её сервер игры: сам спрашивает о ней Google Play Developer API
 * (владелец — obfuscatedAccountId, хэш id игрока), начисляет златники и «потребляет» покупку.
 * Ответы — в игру: send → window.nativeBilling({ type: products | purchases | pending | error, … }).
 */
class Billing(private val act: Activity, private val send: (JSONObject) -> Unit) : PurchasesUpdatedListener {
    private val ok = BillingClient.BillingResponseCode.OK
    private val details = HashMap<String, ProductDetails>()
    private val client: BillingClient = BillingClient.newBuilder(act)
        .setListener(this)
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .build()

    private fun err(op: String, code: Int, message: String?) =
        send(JSONObject().put("type", "error").put("op", op).put("code", code).put("message", message ?: ""))

    private fun ready(op: String, then: () -> Unit) {
        if (client.isReady) { then(); return }
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(r: BillingResult) {
                act.runOnUiThread { if (r.responseCode == ok) then() else err(op, r.responseCode, r.debugMessage) }
            }
            override fun onBillingServiceDisconnected() {}
        })
    }

    private fun pack(list: List<Purchase>) = JSONArray().apply {
        for (p in list) put(JSONObject().put("token", p.purchaseToken).put("products", JSONArray(p.products))
            .put("state", p.purchaseState).put("order", p.orderId ?: ""))
    }

    // наборы златников и их цены в валюте игрока (из Play Console)
    fun products(ids: List<String>) = ready("products") {
        val list = ids.map { QueryProductDetailsParams.Product.newBuilder().setProductId(it).setProductType(BillingClient.ProductType.INAPP).build() }
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build()) { r, res ->
            act.runOnUiThread {
                if (r.responseCode != ok) { err("products", r.responseCode, r.debugMessage); return@runOnUiThread }
                val arr = JSONArray()
                for (d in res.productDetailsList) {
                    @Suppress("DEPRECATION") val o = d.oneTimePurchaseOfferDetails ?: continue
                    details[d.productId] = d
                    arr.put(JSONObject().put("id", d.productId).put("price", o.formattedPrice)
                        .put("micros", o.priceAmountMicros).put("currency", o.priceCurrencyCode))
                }
                send(JSONObject().put("type", "products").put("list", arr))
            }
        }
    }

    // окно покупки Google Play; итог — в onPurchasesUpdated
    fun buy(id: String, acct: String) = ready("buy") {
        val d = details[id]
        if (d == null) { err("buy", BillingClient.BillingResponseCode.ITEM_UNAVAILABLE, "no product"); return@ready }
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build()))
            .setObfuscatedAccountId(acct)
            .build()
        val r = client.launchBillingFlow(act, params)
        if (r.responseCode != ok) err("buy", r.responseCode, r.debugMessage)
    }

    override fun onPurchasesUpdated(r: BillingResult, purchases: MutableList<Purchase>?) {
        act.runOnUiThread {
            if (r.responseCode == ok && purchases != null) send(JSONObject().put("type", "purchases").put("list", pack(purchases)))
            else err("buy", r.responseCode, r.debugMessage)
        }
    }

    // оплаченные, но ещё не засчитанные сервером покупки (игра закрылась посреди покупки, нет сети, отложенная оплата)
    fun pending() = ready("pending") {
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()) { r, list ->
            act.runOnUiThread {
                if (r.responseCode == ok) send(JSONObject().put("type", "pending").put("list", pack(list)))
                else err("pending", r.responseCode, r.debugMessage)
            }
        }
    }

    fun end() { if (client.isReady) client.endConnection() }
}
