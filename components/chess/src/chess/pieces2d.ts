// 2D Chess Piece Graphic Renderer using custom uploaded piece PNGs

export interface Piece2DOptions {
    type: string; // 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
    color: string; // 'w' | 'b'
}

const pieceImageMap: Record<string, string> = {
    p: '/games/chess/pieces/pawn.webp',
    n: '/games/chess/pieces/knight.webp',
    b: '/games/chess/pieces/bishop.webp',
    r: '/games/chess/pieces/rook.webp',
    q: '/games/chess/pieces/queen.webp',
    k: '/games/chess/pieces/king.webp',
};

export function get2DPieceSVG(type: string, color: string): string {
    const pieceKey = type.toLowerCase();
    const imgSrc = pieceImageMap[pieceKey] || pieceImageMap['p'];
    const isWhite = color === 'w';
    const colorClass = isWhite ? 'piece-white' : 'piece-black';

    return `<img src="${imgSrc}" class="piece-2d-img ${colorClass}" alt="${color}${type}" draggable="false" />`;
}
