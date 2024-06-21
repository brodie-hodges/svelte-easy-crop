import type { Size, ImageSize, Point } from './types'

/**
 * Compute the dimension of the crop area based on image size, aspect ratio, and optionally rotation
 * @param imgWidth width of the src image in pixels
 * @param imgHeight height of the src image in pixels
 * @param containerWidth width of the container element in pixels
 * @param containerHeight height of the container element in pixels
 * @param aspect aspect ratio of the crop area
 * @param rotation rotation angle in degrees
 */
export function getCropSize(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number,
  aspect: number,
  rotation = 0
): Size {
  const { width, height } = rotateSize(imgWidth, imgHeight, rotation)
  const fittingWidth = Math.min(width, containerWidth)
  const fittingHeight = Math.min(height, containerHeight)

  if (fittingWidth > fittingHeight * aspect) {
    return {
      width: fittingHeight * aspect,
      height: fittingHeight,
    }
  }

  return {
    width: fittingWidth,
    height: fittingWidth / aspect,
  }
}

/**
 * Ensure a new image position stays in the crop area.
 * @param position new x/y position requested for the image
 * @param imageSize width/height of the src image
 * @param cropSize width/height of the crop area
 * @param zoom zoom value
 * @param rotation rotation angle in degrees
 * @returns
 */
export function restrictPosition(
  position: Point,
  imageSize: Size,
  cropSize: Size,
  zoom: number,
  rotation = 0
): Point {
  const { width, height } = rotateSize(imageSize.width, imageSize.height, rotation)
  return {
    x: restrictPositionCoord(position.x, width, cropSize.width, zoom),
    y: restrictPositionCoord(position.y, height, cropSize.height, zoom),
  }
}

function restrictPositionCoord(
  position: number,
  imageSize: number,
  cropSize: number,
  zoom: number
): number {
  // Default max position calculation
  let maxPosition = (imageSize * zoom) / 2 - cropSize / 2

  // Allow free movement of the image inside the crop area if zoom is less than 1
  // But limit the image's position to inside the cropBox
  if (zoom < 1) {
    maxPosition = cropSize / 2 - (imageSize * zoom) / 2
  }

  return Math.min(maxPosition, Math.max(position, -maxPosition))
}

export function getDistanceBetweenPoints(pointA: Point, pointB: Point): number {
  return Math.sqrt(Math.pow(pointA.y - pointB.y, 2) + Math.pow(pointA.x - pointB.x, 2))
}

export function getRotationBetweenPoints(pointA: Point, pointB: Point): number {
  return (Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x) * 180) / Math.PI
}

/**
 * Compute the output cropped area of the image in percentages and pixels.
 * x/y are the top-left coordinates on the src image
 * @param crop x/y position of the current center of the image
 * @param imgSize width/height of the src image (default is size on the screen, natural is the original size)
 * @param cropSize width/height of the crop area
 * @param aspect aspect value
 * @param zoom zoom value
 * @param rotation rotation angle in degrees
 * @param restrictPosition whether we should limit or not the cropped area
 */
export function computeCroppedArea(
  crop: Point,
  imgSize: ImageSize,
  cropSize: Size,
  aspect: number,
  zoom: number,
  rotation = 0,
  restrictPosition = true
) {
  const limitAreaFn = restrictPosition ? limitArea : noOp
  const rotatedImgSize = rotateSize(imgSize.width, imgSize.height, rotation)
  const rotatedNaturalImgSize = rotateSize(imgSize.naturalWidth, imgSize.naturalHeight, rotation)

  const croppedAreaPercentages = {
    x: limitAreaFn(
      100,
      (((rotatedImgSize.width - cropSize.width / zoom) / 2 - crop.x / zoom) /
        rotatedImgSize.width) *
        100
    ),
    y: limitAreaFn(
      100,
      (((rotatedImgSize.height - cropSize.height / zoom) / 2 - crop.y / zoom) /
        rotatedImgSize.height) *
        100
    ),
    width: limitAreaFn(100, ((cropSize.width / rotatedImgSize.width) * 100) / zoom),
    height: limitAreaFn(100, ((cropSize.height / rotatedImgSize.height) * 100) / zoom),
  }
  const widthInPixels = limitAreaFn(
    rotatedNaturalImgSize.width,
    (croppedAreaPercentages.width * rotatedNaturalImgSize.width) / 100,
    true
  )
  const heightInPixels = limitAreaFn(
    rotatedNaturalImgSize.height,
    (croppedAreaPercentages.height * rotatedNaturalImgSize.height) / 100,
    true
  )
  const isImgWiderThanHigh = rotatedNaturalImgSize.width >= rotatedNaturalImgSize.height * aspect

  const sizePixels = isImgWiderThanHigh
    ? {
        width: Math.round(heightInPixels * aspect),
        height: heightInPixels,
      }
    : {
        width: widthInPixels,
        height: Math.round(widthInPixels / aspect),
      }
  const croppedAreaPixels = {
    ...sizePixels,
    x: limitAreaFn(
      rotatedNaturalImgSize.width - sizePixels.width,
      (croppedAreaPercentages.x * rotatedNaturalImgSize.width) / 100,
      true
    ),
    y: limitAreaFn(
      rotatedNaturalImgSize.height - sizePixels.height,
      (croppedAreaPercentages.y * rotatedNaturalImgSize.height) / 100,
      true
    ),
  }
  return { croppedAreaPercentages, croppedAreaPixels }
}

/**
 * Ensure the returned value is between 0 and max
 * @param max
 * @param value
 * @param shouldRound
 */
function limitArea(max: number, value: number, shouldRound = false): number {
  const v = shouldRound ? Math.round(value) : value
  return Math.min(max, Math.max(0, v))
}

function noOp(max: number, value: number): number {
  return value
}

/**
 * Return the point that is the center of point a and b
 * @param a
 * @param b
 */
export function getCenter(a: Point, b: Point): Point {
  return {
    x: (b.x + a.x) / 2,
    y: (b.y + a.y) / 2,
  }
}

export function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number): Size {
  const rotRad = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}
