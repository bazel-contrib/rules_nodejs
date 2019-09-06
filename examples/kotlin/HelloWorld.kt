import kotlin.browser.*
import kotlinx.html.*
import kotlinx.html.dom.*

fun printHello() {
    document.body!!.append.div {
        span {
            +"Hello from Kotlin!"
        }
    }
}
