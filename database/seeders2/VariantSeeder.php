<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VariantSeeder extends Seeder
{
    public function run(): void
    {
        $variants = [
            ['NAG', 'Nagita', '-', 'female'],
            ['GRT', 'Green Tea', '-', 'unisex'],
            ['MRT', 'Morning Tea', '-', 'unisex'],
            ['ABE', 'Blue Emotion', 'Aigner', 'male'],
            ['FOF', 'Flight Of Fancy', 'Anna Sui', 'female'],
            ['BS', 'Blue Seduction', 'Antonio Banderas', 'male'],
            ['CLP', 'Cloud Pink', 'Ariana Grande', 'female'],
            ['WANT', 'The Most Wanted', 'Azzaro', 'male'],
            // ['HER', 'Her', 'Burberry', 'female'],
            // ['HERI', 'Her Intense', 'Burberry', 'female'],
            // ['HERO', 'Hero', 'Burberry', 'male'],
            // ['GDS', 'Goddess', 'Burberry', 'female'],
            // ['BOA', 'Omnia Amethyste', 'Bvlgari', 'female'],
            // ['GG', 'Good Girl', 'Carolina Herrera', 'female'],
            // ['GGB', 'Good Girl Blush', 'Carolina Herrera', 'female'],
            // ['BLEU', 'Bleu De Chanel', 'Chanel', 'male'],
            // ['COCO', 'Coco Mademoiselle', 'Chanel', 'female'],
            // ['NO5', 'No. 5', 'Chanel', 'female'],
            // ['CLOE', 'Nomade', 'Chloe', 'female'],
            // ['BOUQ', 'Blooming Bouquet', 'Christian Dior', 'female'],
            // ['SVG', 'Sauvage', 'Christian Dior', 'male'],
            // ['MISS', 'Miss Dior', 'Christian Dior', 'female'],
            // ['SVGE', 'Sauvage Elixir', 'Christian Dior', 'male'],
            // ['HOME', 'Dior Homme', 'Christian Dior', 'male'],
            // ['CAV', 'Aventus', 'Creed', 'male'],
            // ['EAC', 'Eau Capitale', 'Diptyque', 'unisex'],
            // ['RIA', 'Euphoria (L’Imperatrice 3)', 'Dolce & Gabbana', 'female'],
            // ['DDB', 'Desire Blue', 'Dunhill', 'male'],
            // ['WAY', 'My Way', 'Giorgio Armani', 'female'],
            // ['SIF', 'Si Fiori', 'Giorgio Armani', 'female'],
            // ['SWY', 'Stronger With You', 'Giorgio Armani', 'male'],
            // ['BLOM', 'Bloom', 'Gucci', 'female'],
            // ['FLO', 'Flower', 'Gucci', 'female'],
            // ['MANX', 'Hallowen Man X', 'Hallowen', 'male'],
            // ['TWIL', 'Twilly', 'Hermes', 'female'],
            // ['JPM', 'Scandal Men (Scandal Pour Homme)', 'Jean Paul Gaultier', 'male'],
            // ['JPS', 'Scandal', 'Jean Paul Gaultier', 'female'],
            // ['JMW', 'Wood Sage & Sea Salt', 'Jo Malone', 'unisex'],
            // ['POPY', 'Scarlet Poppy', 'Jo Malone', 'unisex'],
            // ['JME', 'English Pear & Freesia', 'Jo Malone', 'female'],
            // ['JMP', 'Peony Blush', 'Jo Malone', 'female'],
            // ['EDEN', 'Eden Sparkling Lychee', 'Kayali', 'female'],
            // ['ROC', 'Vanilla Candy Rock Sugar', 'Kayali', 'female'],
            // ['VIE', 'La Vie Est Belle', 'Lancome', 'female'],
            // ['IDOL', 'Idole Nectar', 'Lancome', 'female'],
            // ['SANT', 'Santal 33', 'Le Labo', 'unisex'],
            // ['BRO', 'Baccarat Rouge 540', 'Maison Francis Kurkdjian', 'unisex'],
            // ['BATH', 'Bubble Bath', 'Maison Margiela', 'unisex'],
            // ['BREK', 'Coffee Break', 'Maison Margiela', 'unisex'],
            // ['MVR', 'Vanilla Rose', 'Mancera', 'unisex'],
            // ['MJP', 'Perfect', 'Marc Jacobs', 'female'],
            // ['GI', 'Garuda Indonesia', 'Ori HS', 'unisex'],
            // ['ONE', 'One Million Lucky', 'Paco Rabbane', 'male'],
            // ['FAME', 'Fame', 'Paco Rabbane', 'female'],
            // ['ONER', 'One Million Royal', 'Paco Rabbane', 'male'],
            // ['DEL', 'Delina', 'Parfum De Marly', 'female'],
            // ['MUSK', 'White Musk', 'The Body Shop', 'unisex'],
            // ['TTV', 'Tobacco Vanille', 'Tomford', 'unisex'],
            // ['BIR', 'Born in Roma Green', 'Valentino', 'male'],
            // ['EROF', 'Eros Flame', 'Versace', 'male'],
            // ['EROS', 'Eros', 'Versace', 'male'],
            // ['SCN', 'Scandalous', 'Victoria\'s Secret', 'female'],
            // ['VBS', 'Bombshell Escape', 'Victoria\'s Secret', 'female'],
            // ['VB', 'Bombshell', 'Victoria\'s Secret', 'female'],
            // ['VCS', 'Coconut Passion', 'Victoria\'s Secret', 'female'],
            // ['TEAS', 'Tease', 'Victoria\'s Secret', 'female'],
            // ['BOP', 'Black Opium', 'Yves Saint Laurent', 'female'],
            // ['BOPR', 'Black Opium Over Red', 'Yves Saint Laurent', 'female'],
            // ['Y', 'Y', 'Yves Saint Laurent', 'male'],
            // ['BOM', 'Black Opium Men', 'Yves Saint Laurent', 'male'],
            // ['LIB', 'Libre', 'Yves Saint Laurent', 'female'],
            // ['SELF', 'My Self', 'Yves Saint Laurent', 'male'],
        ];

        foreach ($variants as $v) {
            DB::table('variants')->insert([
                'id'          => Str::uuid(),
                'code'        => $v[0],
                'name'        => ($v[2] !== '-' ? $v[2] . ' ' : '') . $v[1], // Menggabungkan Brand + Nama jika ada brand
                'gender'      => $v[3],
                'description' => "Brand: " . $v[2],
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }
    }
}
