import { BigInt, BigDecimal } from "@graphprotocol/graph-ts"
import { Sync, Swap, Mint, Burn, Approval, Transfer } from "../generated/UniswapV2Pair_USDT_USDC/UniswapV2Pair_USDT_USDC"
import { Volume, Reserve, LiquidityProvider } from "../generated/schema"

const INTERVAL = BigInt.fromI32(21600) // 6 hours in seconds

function getIntervalId(timestamp: BigInt): string {
  return timestamp.div(INTERVAL).toString()
}

function getOrCreateVolume(timestamp: BigInt): Volume {
  let intervalId = getIntervalId(timestamp)
  let volume = Volume.load(intervalId)
  if (volume == null) {
    volume = new Volume(intervalId)
    volume.timestamp = timestamp
    volume.volumeToken0 = BigDecimal.fromString("0")
    volume.volumeToken1 = BigDecimal.fromString("0")
  }
  return volume as Volume
}

function getOrCreateReserve(timestamp: BigInt): Reserve {
  let intervalId = getIntervalId(timestamp)
  let reserve = Reserve.load(intervalId)
  if (reserve == null) {
    reserve = new Reserve(intervalId)
    reserve.timestamp = timestamp
    reserve.reserve0 = BigDecimal.fromString("0")
    reserve.reserve1 = BigDecimal.fromString("0")
  }
  return reserve as Reserve
}

function getOrCreateLiquidityProvider(timestamp: BigInt): LiquidityProvider {
  let intervalId = getIntervalId(timestamp)
  let provider = LiquidityProvider.load(intervalId)
  if (provider == null) {
    provider = new LiquidityProvider(intervalId)
    provider.count = BigInt.fromI32(0)
    provider.timestamp = timestamp
  }
  return provider as LiquidityProvider
}

export function handleSync(event: Sync): void {
  let reserve = getOrCreateReserve(event.block.timestamp)
  reserve.reserve0 = event.params.reserve0.toBigDecimal()
  reserve.reserve1 = event.params.reserve1.toBigDecimal()
  reserve.save()
}

export function handleSwap(event: Swap): void {
  let volume = getOrCreateVolume(event.block.timestamp)
  volume.volumeToken0 = volume.volumeToken0.plus(event.params.amount0In.minus(event.params.amount0Out).toBigDecimal())
  volume.volumeToken1 = volume.volumeToken1.plus(event.params.amount1In.minus(event.params.amount1Out).toBigDecimal())
  volume.save()
}

export function handleMint(event: Mint): void {
  let provider = getOrCreateLiquidityProvider(event.block.timestamp)
  provider.count = provider.count.plus(BigInt.fromI32(1))
  provider.save()
}

export function handleBurn(event: Burn): void {
  let provider = getOrCreateLiquidityProvider(event.block.timestamp)
  provider.count = provider.count.minus(BigInt.fromI32(1))
  provider.save()
}

export function handleApproval(event: Approval): void {
  // handle approval event if needed
}

export function handleTransfer(event: Transfer): void {
  // handle transfer event if needed
}
